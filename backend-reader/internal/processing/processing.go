package processing

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"strings"
	"unsafe"
)

const (
	RAW_PACKET_SIZE = 68
)

// entry type enum
const (
    ENTER = iota
    EXIT
    PANIC
)

// alignment is based on the largest single type
// in this case, align everything to 4 bytes
type TraceFunctionGeneralEntry struct {
	TraceType   uint32
    CoreId      uint8
	_ 			[3]uint8
    Timestamp   uint32
    Trace_id    uint32
}

type TraceFunctionEnterEntry struct {
    TraceFunctionGeneralEntry
    ValueTypes  uint8
    ArgCount    uint8
	_ 			[2]uint8
    FuncArgs    [4]uint32
    FuncName    [16]byte
}

type TraceFunctionExitEntry struct {
    TraceFunctionGeneralEntry
    ValueTypes  uint8
    _           [3]uint8
    ReturnVal   uint32
    _           [3]uint32
    FuncName    [16]byte
}

type TraceFunctionPanicEntry struct {
	TraceFunctionGeneralEntry
	FaultingPC 			uint32
	ExceptionReason 	[48]byte
}


type Processor struct {
	MessageQueue <-chan [RAW_PACKET_SIZE]byte
	PortName 	string
}

func NewProcessor(portname string, messageQueue <-chan [RAW_PACKET_SIZE]byte) *Processor {
	return &Processor{
		MessageQueue: messageQueue,
		PortName: portname,
	}
}

func (p *Processor) Process() {
	tempBuf := <-p.MessageQueue
	
	// try to access the first byte of the message
	// which would give you information on what type of entry it is
	typePointer := unsafe.Pointer(&tempBuf[0])

	streamReader := bytes.NewReader(tempBuf[:len(tempBuf) - 2])
	switch *(*uint32)(typePointer) {
	case ENTER:
		entry := TraceFunctionEnterEntry{}
		if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
			if !strings.Contains(err.Error(), "EOF") {
				fmt.Printf("Error reading ENTER entry: %v\n", err)
				return
			}
		}
		processEntry(&entry)
	case EXIT:
		entry := TraceFunctionExitEntry{}
		if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
			if !strings.Contains(err.Error(), "EOF") {
				fmt.Printf("Error reading EXIT entry: %v\n", err)
				return
			}
		}
		processExit(&entry)
	case PANIC:
		entry := TraceFunctionPanicEntry{}
		if err := binary.Read(streamReader, binary.LittleEndian, &entry); err != nil {
			if !strings.Contains(err.Error(), "EOF") {
				fmt.Printf("Error reading PANIC entry: %v\n", err)
				return
			}
		}
		processPanic(&entry)
	default:
		fmt.Println("Unsure")
	}
}

func (p *Processor) Run() {
	for {
		p.Process()
	}
}

func processEntry(entry *TraceFunctionEnterEntry) {
	fmt.Println("got entry")
}

func processExit(entry *TraceFunctionExitEntry) {
	fmt.Println("got exit")
}

func processPanic(entry *TraceFunctionPanicEntry) {
	fmt.Println("got panic")
}