// Simple DOM toast utility (no React dependency) - easy to call from anywhere
type ToastType = 'info'|'success'|'error'

function ensureContainer(){
  let c = document.getElementById('ap-toast-container')
  if (!c){
    c = document.createElement('div')
    c.id = 'ap-toast-container'
    c.style.position = 'fixed'
    c.style.right = '16px'
    c.style.bottom = '16px'
    c.style.zIndex = '9999'
    c.style.display = 'flex'
    c.style.flexDirection = 'column'
    c.style.gap = '8px'
    document.body.appendChild(c)
  }
  return c
}

export function showToast(message: string, type: ToastType = 'info', duration = 3500){
  if (typeof document === 'undefined') return
  const c = ensureContainer()
  const el = document.createElement('div')
  el.className = `ap-toast ap-toast-${type}`
  el.textContent = message
  el.style.minWidth = '180px'
  el.style.padding = '10px 14px'
  el.style.borderRadius = '10px'
  el.style.color = 'white'
  el.style.fontSize = '13px'
  el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)'
  el.style.animation = 'slideIn 260ms ease'
  if (type === 'success') el.style.background = 'linear-gradient(90deg,#10b981,#059669)'
  else if (type === 'error') el.style.background = 'linear-gradient(90deg,#ef4444,#dc2626)'
  else el.style.background = 'linear-gradient(90deg,#374151,#111827)'

  c.appendChild(el)
  const timeout = setTimeout(()=>{
    try{ el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(()=>el.remove(),220) }catch(e){}
  }, duration)

  el.addEventListener('click', ()=>{ clearTimeout(timeout); try{ el.remove() }catch(e){} })
}

export default { showToast }
