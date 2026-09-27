#include <iostream>
#include <memory>
#include "order/Order.hpp"
#include "book/OrderBook.hpp"

int main() {
    using namespace engine;

    OrderBook book("AAPL");

    auto buy1 = std::make_shared<Order>("buy-1", "acc-1", "AAPL", Side::BUY, OrderType::LIMIT, 100, 190.00);
    auto buy2 = std::make_shared<Order>("buy-2", "acc-2", "AAPL", Side::BUY, OrderType::LIMIT, 50, 191.00);
    auto sell1 = std::make_shared<Order>("sell-1", "acc-3", "AAPL", Side::SELL, OrderType::LIMIT, 75, 192.00);

    book.addOrder(buy1);
    book.addOrder(buy2);
    book.addOrder(sell1);

    std::cout << "Best bid: " << *book.getBestBid() << "\n";
    std::cout << "Best ask: " << *book.getBestAsk() << "\n";
    std::cout << "Bid levels: " << book.getBidLevelCount() << "\n";
    std::cout << "Ask levels: " << book.getAskLevelCount() << "\n";

    bool removed = book.removeOrder("buy-2");
    std::cout << "Removed buy-2: " << (removed ? "yes" : "no") << "\n";
    std::cout << "Best bid after removal: " << *book.getBestBid() << "\n";

    return 0;
}