#include <iostream>
#include "order/Order.hpp"

int main() {
    using namespace engine;

    Order buyOrder("order-1", "account-1", "AAPL", Side::BUY, OrderType::LIMIT, 100, 190.50);
    std::cout << "Created order " << buyOrder.getId()
              << " remaining=" << buyOrder.getRemainingQuantity() << "\n";

    buyOrder.fill(40);
    std::cout << "After partial fill, remaining=" << buyOrder.getRemainingQuantity()
              << " status=" << static_cast<int>(buyOrder.getStatus()) << "\n";

    buyOrder.fill(60);
    std::cout << "After full fill, remaining=" << buyOrder.getRemainingQuantity()
              << " status=" << static_cast<int>(buyOrder.getStatus()) << "\n";

    return 0;
}