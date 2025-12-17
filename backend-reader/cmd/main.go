package main

import (
	"RP-UCLA/backend-reader/internal/processing"
	"RP-UCLA/backend-reader/internal/rSerial"
)

const (
	PORT_NAME = "/dev/cu.usbserial-0001"
	QUEUE_CAPACITY = 20
	RAW_PACKET_SIZE = 68
)

var STOP_SEQUENCE = [2]byte{'\r', '\n'}


func main() {
	messageQueue := make(chan [RAW_PACKET_SIZE]byte, QUEUE_CAPACITY)
	port := rSerial.NewRSerial(PORT_NAME, 115200, STOP_SEQUENCE[:], messageQueue)
	defer port.Close()

	processor := processing.NewProcessor(PORT_NAME, messageQueue)

	go port.Run()
	processor.Run()
}