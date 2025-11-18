import json
import os
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: API для работы с товарами и контрагентами
    Args: event с httpMethod (GET/POST/PUT/DELETE), body, queryStringParameters
    Returns: JSON с данными товаров/контрагентов
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    conn = get_db_connection()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters') or {}
            action = params.get('action', 'get_products')
            
            if action == 'get_products':
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute('''
                        SELECT p.*, s.name as supplier_name 
                        FROM products p 
                        LEFT JOIN suppliers s ON p.supplier_id = s.id 
                        ORDER BY p.date_added DESC
                    ''')
                    products = cur.fetchall()
                    
                    for p in products:
                        if p['date_added']:
                            p['date_added'] = p['date_added'].isoformat()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'products': products})
                    }
            
            elif action == 'get_suppliers':
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute('SELECT * FROM suppliers ORDER BY name')
                    suppliers = cur.fetchall()
                    
                    for s in suppliers:
                        if s['created_at']:
                            s['created_at'] = s['created_at'].isoformat()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'suppliers': suppliers})
                    }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'add_product':
                with conn.cursor() as cur:
                    cur.execute('''
                        INSERT INTO products (name, article, image_url, hint, sale_price, purchase_price, quantity, supplier_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id
                    ''', (
                        body_data['name'],
                        body_data['article'],
                        body_data.get('image_url'),
                        body_data.get('hint'),
                        body_data.get('sale_price'),
                        body_data.get('purchase_price'),
                        body_data.get('quantity', 1),
                        body_data.get('supplier_id')
                    ))
                    product_id = cur.fetchone()[0]
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'id': product_id, 'success': True})
                    }
            
            elif action == 'add_supplier':
                with conn.cursor() as cur:
                    cur.execute('''
                        INSERT INTO suppliers (name, total_debt)
                        VALUES (%s, %s)
                        RETURNING id
                    ''', (body_data['name'], body_data.get('total_debt', 0)))
                    supplier_id = cur.fetchone()[0]
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        },
                        'body': json.dumps({'id': supplier_id, 'success': True})
                    }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            product_id = body_data['id']
            
            with conn.cursor() as cur:
                cur.execute('''
                    UPDATE products 
                    SET purchase_price = %s, quantity = %s, is_completed = %s
                    WHERE id = %s
                ''', (
                    body_data.get('purchase_price'),
                    body_data.get('quantity'),
                    body_data.get('is_completed', False),
                    product_id
                ))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'success': True})
                }
        
        elif method == 'DELETE':
            params = event.get('queryStringParameters') or {}
            product_id = params.get('id')
            
            with conn.cursor() as cur:
                cur.execute('UPDATE products SET is_completed = true WHERE id = %s', (product_id,))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({'success': True})
                }
    
    finally:
        conn.close()
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Method not allowed'})
    }
