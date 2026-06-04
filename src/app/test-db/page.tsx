import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: products, error } = await supabase.from('products').select('*')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Successful!</h1>
      <p className="mb-4 text-muted-foreground">Here are the products fetched directly from your Supabase database:</p>
      
      {error && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4">
          Error: {error.message}
        </div>
      )}

      <ul className="list-disc pl-6 space-y-2">
        {products && products.length > 0 ? (
          products.map((product: any) => (
            <li key={product.id}>
              <strong>{product.name}</strong> - ${product.selling_price} (Stock: {product.current_stock})
            </li>
          ))
        ) : (
          <li className="text-muted-foreground">No products found. Did you run the Subway SQL script in your Supabase SQL editor?</li>
        )}
      </ul>
    </div>
  )
}
