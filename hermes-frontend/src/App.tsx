import { useEffect, useRef } from "react"

const webSocketUrl = "ws://localhost:8080/data"

function App() {
  const webSocketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    webSocketRef.current = new WebSocket(webSocketUrl)

    webSocketRef.current.onopen = (e) => {
      console.log("Connection with backend established")
    }

    webSocketRef.current.onmessage = (e) => {
      console.log(e)
    }

    return () => {
      if (webSocketRef.current) {
        webSocketRef.current.close()
        webSocketRef.current = null
      } 
    }
  }, [])
  return <div>Hello world</div>
}

export default App
