package rSerial

import (
	"bytes"
	"fmt"
	"log"

	"go.bug.st/serial"
)

const (
	RAW_PACKET_SIZE = 72
	RAW_MESSAGE_SIZE = RAW_PACKET_SIZE + 2
)

type RSerial struct {
	serial.Port
	MessageQueue chan<- [RAW_PACKET_SIZE]byte
	PortName 	string
	StopSequence []byte
}

func NewRSerial(portName string, baudrate int, stopSequence []byte, messageQueue chan<- [RAW_PACKET_SIZE]byte) *RSerial {
	mode := &serial.Mode{
		BaudRate: baudrate,
	}

	port, err := serial.Open(portName, mode)
	if err != nil {
		log.Fatalf("Unable to open serial port %s: %v\n", portName, err)
	}

	return &RSerial{
		Port: port,
		MessageQueue: messageQueue,
		PortName: portName,
		StopSequence: stopSequence,
	}
}

func (r *RSerial) sync() {
	twoBytes := [2]byte{ 0x0, 0x0 }
	oneByte := [1]byte{}

	for !bytes.Equal(twoBytes[:], r.StopSequence) {
		_, err := r.Read(oneByte[:])
		if err != nil {
			fmt.Printf("Error while resyncing serial port %v", err)
		}

		// update the two byte sequence
		twoBytes[0] = twoBytes[1]
		twoBytes[1] = oneByte[0]
	}
}

func (r *RSerial) ReadPacket() error {
	count := 0
	tempBuf := [RAW_MESSAGE_SIZE]byte{}

	for count < RAW_MESSAGE_SIZE {
		n, err := r.Read(tempBuf[count:])
		if err != nil {
			fmt.Printf("error in reader, %v\n", err)
			r.sync()
		}
		count += n
	}

	if !bytes.Equal(tempBuf[len(tempBuf) - 2 : ], []byte{'\r', '\n'}) {
		return fmt.Errorf("control sequence at the end incorrect, %v", tempBuf[len(tempBuf) - 2 : ])
	}

	r.MessageQueue <- [RAW_PACKET_SIZE]byte(tempBuf[:len(tempBuf) - 2])

	return nil
}

func (r *RSerial) Run() {
	r.ResetInputBuffer()
	r.sync()

	for {
		if err := r.ReadPacket(); err != nil {
			fmt.Printf("%v\n", err)
			r.sync()
		}
	}
}