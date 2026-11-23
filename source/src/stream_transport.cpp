#include "stream_transport.h"

// The destructor is defined in a .cpp file so the interface header stays light
// and the repository keeps its "one header, one .cpp" layout.
IStreamTransport::~IStreamTransport() = default;
