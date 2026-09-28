#include <iostream>
#include <memory>
#include "order/Order.hpp"
#include "book/OrderBook.hpp"

using namespace engine;

static const char* eventName(EventType t) {
    switch (t) {
        case EventType::ORDER_RESTED:    return "ORDER_RESTED";
        case EventType::TRADE_EXECUTED:  return "TRADE_EXECUTED";
        case EventType::ORDER_FILLED:    return "ORDER_FILLED";
        case EventType::ORDER_CANCELLED: return "ORDER_CANCELLED";
        case EventType::ORDER_REJECTED:  return "ORDER_REJECTED";
    }
    return "UNKNOWN";
}

static const char* resultName(CancelResult r) {
    return r == CancelResult::CANCELLED ? "CANCELLED" : "NOT_FOUND";
}

int main() {
    OrderBook book("AAPL");

    book.setEventListener([](const EngineEvent& e) {
        std::cout << "  [event] " << eventName(e.type);
        if (!e.orderId.empty()) {
            std::cout << " order=" << e.orderId;
        }
        if (e.trade) {
            std::cout << " trade=" << e.trade->quantity << "@" << e.trade->price
                      << " (" << e.trade->buyOrderId << "/" << e.trade->sellOrderId << ")";
        }
        std::cout << "\n";
    });

    std::cout << "--- Test 1: partial fill, then cancel the resting remainder ---\n";
    auto sell1 = std::make_shared<Order>("sell-1", "acc-1", "AAPL", Side::SELL, OrderType::LIMIT, 100, 190.00);
    auto buy1 = std::make_shared<Order>("buy-1", "acc-2", "AAPL", Side::BUY, OrderType::LIMIT, 40, 190.00);
    book.submitOrder(sell1);
    book.submitOrder(buy1);
    std::cout << "sell-1 remaining: " << sell1->getRemainingQuantity()
              << " status: " << static_cast<int>(sell1->getStatus()) << "\n";

    auto r1 = book.cancelOrder("sell-1");
    std::cout << "cancel sell-1: " << resultName(r1) << "\n";
    std::cout << "sell-1 status: " << static_cast<int>(sell1->getStatus()) << "\n";
    std::cout << "Best ask: "
              << (book.getBestAsk() ? std::to_string(*book.getBestAsk()) : "none") << "\n\n";

    std::cout << "--- Test 2: cancel something that can't be cancelled ---\n";
    std::cout << "cancel sell-1 again: " << resultName(book.cancelOrder("sell-1")) << "\n";
    std::cout << "cancel does-not-exist: " << resultName(book.cancelOrder("does-not-exist")) << "\n\n";

    std::cout << "--- Test 3: filled orders can't be cancelled ---\n";
    auto sell2 = std::make_shared<Order>("sell-2", "acc-3", "AAPL", Side::SELL, OrderType::LIMIT, 50, 191.00);
    auto buy2 = std::make_shared<Order>("buy-2", "acc-4", "AAPL", Side::BUY, OrderType::MARKET, 50);
    book.submitOrder(sell2);
    book.submitOrder(buy2);
    std::cout << "cancel sell-2: " << resultName(book.cancelOrder("sell-2")) << "\n\n";

    std::cout << "--- Test 4: market order with no liquidity ---\n";
    auto buy3 = std::make_shared<Order>("buy-3", "acc-5", "AAPL", Side::BUY, OrderType::MARKET, 10);
    book.submitOrder(buy3);
    std::cout << "buy-3 status: " << static_cast<int>(buy3->getStatus()) << "\n";

    return 0;
}