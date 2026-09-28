#pragma once

#include <memory>
#include <ostream>
#include <string>
#include "order/Order.hpp"
#include "book/OrderBook.hpp"

namespace engine {

// These make GoogleTest print readable names instead of raw bytes when an EXPECT_EQ fails.
inline void PrintTo(OrderStatus s, std::ostream* os) {
    switch (s) {
        case OrderStatus::PENDING:          *os << "PENDING"; break;
        case OrderStatus::PARTIALLY_FILLED: *os << "PARTIALLY_FILLED"; break;
        case OrderStatus::FILLED:           *os << "FILLED"; break;
        case OrderStatus::CANCELLED:        *os << "CANCELLED"; break;
        case OrderStatus::REJECTED:         *os << "REJECTED"; break;
    }
}

inline void PrintTo(CancelResult r, std::ostream* os) {
    *os << (r == CancelResult::CANCELLED ? "CANCELLED" : "NOT_FOUND");
}

inline void PrintTo(EventType t, std::ostream* os) {
    switch (t) {
        case EventType::ORDER_RESTED:    *os << "ORDER_RESTED"; break;
        case EventType::TRADE_EXECUTED:  *os << "TRADE_EXECUTED"; break;
        case EventType::ORDER_FILLED:    *os << "ORDER_FILLED"; break;
        case EventType::ORDER_CANCELLED: *os << "ORDER_CANCELLED"; break;
        case EventType::ORDER_REJECTED:  *os << "ORDER_REJECTED"; break;
    }
}

// Shortcut so each test doesn't repeat the account id and symbol.
inline std::shared_ptr<Order> makeOrder(const std::string& id,
                                        Side side,
                                        OrderType type,
                                        int quantity,
                                        double price = 0.0) {
    return std::make_shared<Order>(id, "acc-" + id, "AAPL", side, type, quantity, price);
}

} // namespace engine