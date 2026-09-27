#include <iostream>
#include <memory>
#include "order/Order.hpp"
#include "book/OrderBook.hpp"

int main() {
    using namespace engine;

    OrderBook book("AAPL");

    auto sell1 = std::make_shared<Order>("sell-1", "acc-1", "AAPL", Side::SELL, OrderType::LIMIT, 100, 190.00);
    book.addOrder(sell1);

    auto buy1 = std::make_shared<Order>("buy-1", "acc-2", "AAPL", Side::BUY, OrderType::LIMIT, 50, 191.00);
    auto trades = book.submitOrder(buy1);

    std::cout << "Trades generated: " << trades.size() << "\n";
    for (const auto& t : trades) {
        std::cout << "  " << t.quantity << " @ " << t.price
                  << " (buy=" << t.buyOrderId << " sell=" << t.sellOrderId << ")\n";
    }

    std::cout << "sell1 remaining: " << sell1->getRemainingQuantity() << "\n";
    std::cout << "buy1 remaining: " << buy1->getRemainingQuantity() << "\n";

    auto bestAsk = book.getBestAsk();
    std::cout << "Best ask after match: " << (bestAsk ? std::to_string(*bestAsk) : "none") << "\n";

    return 0;
}