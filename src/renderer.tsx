import { createRoot } from 'react-dom/client'
import App from './App'

const root = document.getElementById('root')

if (!root) {
  throw new Error('index.html must have a "root" node')
}

createRoot(root).render(<App />)
