#include <iostream>
#include <string>
#include "protocol/EngineProtocol.hpp"

int main() {
    engine::EngineProtocol protocol;

    // Tells the parent process we're up and listening.
    std::cout << R"({"type":"ready"})" << '\n' << std::flush;

    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) {
            continue;
        }
        for (const auto& output : protocol.handleLine(line)) {
            std::cout << output << '\n';
        }
        std::cout << std::flush;   // the parent is waiting on this command's "done" line
    }

    return 0;   // stdin closed: the backend went away, so exit cleanly
}