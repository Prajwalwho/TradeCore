#pragma once

#include <string>
#include <unordered_map>
#include <vector>
#include "book/OrderBook.hpp"
#include "execution/Event.hpp"

namespace engine {

// Translates JSON command lines into engine calls and engine events into JSON lines.
// Knows nothing about stdin/stdout, so it can be unit-tested and reused over any transport.
class EngineProtocol {
public:
    EngineProtocol() = default;

    // The books hold listeners that point back at this object, so it must not move.
    EngineProtocol(const EngineProtocol&) = delete;
    EngineProtocol& operator=(const EngineProtocol&) = delete;

    // One command line in; zero or more event lines followed by exactly one
    // "done" line (or a single "error" line) out. Each output is one JSON document.
    std::vector<std::string> handleLine(const std::string& line);

private:
    OrderBook& bookFor(const std::string& symbol);

    std::unordered_map<std::string, OrderBook> books_;   // one book per instrument
    std::vector<EngineEvent> pending_;                   // events raised by the current command
};

} // namespace engine