import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('Z-Express ErrorBoundary',error,info);}
  render(){if(this.state.error)return <main className="fatal"><div><img src="/favicon.svg" alt="Z" width="52"/><h1>Aplikasi mengalami kendala</h1><p>Progres lokal tidak otomatis dihapus. Coba muat ulang. Jika error berulang, cek Console browser (F12).</p><pre>{String(this.state.error?.message||'Unknown error')}</pre><button onClick={()=>location.reload()}>Muat ulang</button><button className="danger" onClick={()=>{if(confirm('Hapus hanya save Z-Express di browser ini?')){localStorage.removeItem('zidane.express.operations.v1');location.reload();}}}>Reset save Z-Express</button></div></main>;return this.props.children;}
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
