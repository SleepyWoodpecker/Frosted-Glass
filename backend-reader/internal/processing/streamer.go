package processing

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

const (
	READ_BUFFER_SIZE = 128
	WRITE_BUFFER_SIZE = 1024
)

var Upgrader = websocket.Upgrader{
	ReadBufferSize: READ_BUFFER_SIZE,
	WriteBufferSize: WRITE_BUFFER_SIZE,
	// allow all sends from localhost
	CheckOrigin: func (r *http.Request) bool { return true },
}

type SocketManager struct {
    clients map[*websocket.Conn]bool
    lock    sync.Mutex
}

func NewSocketManager() *SocketManager {
    return &SocketManager{
        clients: make(map[*websocket.Conn]bool),
    }
}

func (manager *SocketManager) Register(conn *websocket.Conn) {
    manager.lock.Lock()
    defer manager.lock.Unlock()
    manager.clients[conn] = true
}

func (manager *SocketManager) Unregister(conn *websocket.Conn) {
    manager.lock.Lock()
    defer manager.lock.Unlock()
    if _, ok := manager.clients[conn]; ok {
        delete(manager.clients, conn)
        conn.Close()
    }
}

func (manager *SocketManager) Broadcast(data interface{}) {
    manager.lock.Lock()
    defer manager.lock.Unlock()

    for conn := range manager.clients {
        // WriteJSON automatically marshals your structs to JSON
        err := conn.WriteJSON(data)
        if err != nil {
            // If error, assume client disconnected and clean up
            conn.Close()
            delete(manager.clients, conn)
        }
    }
}