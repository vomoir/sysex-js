import PartEditor from './PartEditor'

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'sans-serif'
    }}>
      <PartEditor />
    </div>
  )
}

export default App
