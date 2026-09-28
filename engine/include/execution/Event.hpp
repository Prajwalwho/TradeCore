#pragma once

#include <optional>
#include <string>
#include "execution/Trade.hpp"

namespace engine {

enum class EventType {
    ORDER_RESTED,
    TRADE_EXECUTED,
    ORDER_FILLED,
    ORDER_CANCELLED,
    ORDER_REJECTED
};

struct EngineEvent {
    EventType type;
    std::string orderId;          // empty for TRADE_EXECUTED
    std::optional<Trade> trade;   // only set for TRADE_EXECUTED
};

} // namespace engine