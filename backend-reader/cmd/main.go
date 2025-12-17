package main

import (
	"RP-UCLA/backend-reader/internal/processing"
	"RP-UCLA/backend-reader/internal/rSerial"
	"fmt"
	"net/http"
)

const (
	PORT_NAME = "/dev/cu.usbserial-0001"
	QUEUE_CAPACITY = 20
	RAW_PACKET_SIZE = 72
)

var STOP_SEQUENCE = [2]byte{'\r', '\n'}


func main() {
	messageQueue := make(chan [RAW_PACKET_SIZE]byte, QUEUE_CAPACITY)
	port := rSerial.NewRSerial(PORT_NAME, 115200, STOP_SEQUENCE[:], messageQueue)
	defer port.Close()

	socketManager := processing.NewSocketManager()

	processor := processing.NewProcessor(PORT_NAME, messageQueue, socketManager)

	http.HandleFunc("/data", func(w http.ResponseWriter, r *http.Request) {
		conn, err := processing.Upgrader.Upgrade(w, r, nil)
		if err != nil {
			fmt.Printf("could not create a new WS connection %v", err)
			return
		}

		socketManager.Register(conn)
		fmt.Println("New connection created")

		for {
			if _, _, err := conn.NextReader(); err != nil {
				socketManager.Unregister(conn)
				break
			}		
		}
	})


	go port.Run()
	go processor.Run()

	fmt.Println("Server started on :8080")
    http.ListenAndServe(":8080", nil)
}