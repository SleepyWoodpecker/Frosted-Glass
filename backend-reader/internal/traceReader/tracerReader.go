package tracereader

type TraceReader interface {
	ReadPacket() error
	Run()
}