import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)

// 오프라인 대비: 실제 배포 주소(https)에서만 서비스 워커 등록 (로컬 개발·미리보기에서는 안 함)
if('serviceWorker' in navigator&&location.protocol==='https:'&&!import.meta.env.DEV){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{})})}
