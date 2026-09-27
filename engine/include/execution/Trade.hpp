#pragma once

#include <string>
#include <chrono>

namespace engine {

struct Trade {
    std::string id;
    std::string buyOrderId;
    std::string sellOrderId;
    std::string instrumentSymbol;
    double price;
    int quantity;
    std::chrono::system_clock::time_point executedAt;
};

} // namespace engine