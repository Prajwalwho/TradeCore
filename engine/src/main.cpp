#include <iostream>
#include <memory>
#include "order/Order.hpp"
#include "book/OrderBook.hpp"

int main() {
    using namespace engine;

    OrderBook book("AAPL");

    auto sell1 = std::make_shared<Order>("sell-1", "acc-1", "AAPL", Side::SELL, OrderType::LIMIT, 50, 190.00);
    auto sell2 = std::make_shared<Order>("sell-2", "acc-2", "AAPL", Side::SELL, OrderType::LIMIT, 50, 191.00);
    auto sell3 = std::make_shared<Order>("sell-3", "acc-3", "AAPL", Side::SELL, OrderType::LIMIT, 50, 192.00);
    book.addOrder(sell1);
    book.addOrder(sell2);
    book.addOrder(sell3);

    std::cout << "--- Test 1: Market order sweeping 3 levels ---\n";
    auto marketBuy = std::make_shared<Order>("mkt-buy-1", "acc-4", "AAPL", Side::BUY, OrderType::MARKET, 120);
    auto trades1 = book.submitOrder(marketBuy);

    std::cout << "Trades: " << trades1.size() << "\n";
    for (const auto& t : trades1) {
        std::cout << "  " << t.quantity << " @ " << t.price << "\n";
    }
    std::cout << "marketBuy filled: " << marketBuy->getFilledQuantity()
              << " remaining: " << marketBuy->getRemainingQuantity() << "\n";
    std::cout << "Best ask after sweep: "
              << (book.getBestAsk() ? std::to_string(*book.getBestAsk()) : "none") << "\n\n";

    std::cout << "--- Test 2: Market order exceeding all available liquidity ---\n";
    auto marketBuy2 = std::make_shared<Order>("mkt-buy-2", "acc-5", "AAPL", Side::BUY, OrderType::MARKET, 100);
    auto trades2 = book.submitOrder(marketBuy2);

    std::cout << "Trades: " << trades2.size() << "\n";
    for (const auto& t : trades2) {
        std::cout << "  " << t.quantity << " @ " << t.price << "\n";
    }
    std::cout << "marketBuy2 filled: " << marketBuy2->getFilledQuantity()
              << " remaining: " << marketBuy2->getRemainingQuantity()
              << " status: " << static_cast<int>(marketBuy2->getStatus()) << "\n";

    return 0;
}