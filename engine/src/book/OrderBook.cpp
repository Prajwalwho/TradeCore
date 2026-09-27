#include "book/OrderBook.hpp"
#include <stdexcept>

namespace engine {

OrderBook::OrderBook(std::string instrumentSymbol)
    : instrumentSymbol_(std::move(instrumentSymbol)) {}

void OrderBook::addOrder(std::shared_ptr<Order> order) {
    if (!order) {
        throw std::invalid_argument("Cannot add null order");
    }
    if (order->getInstrumentSymbol() != instrumentSymbol_) {
        throw std::invalid_argument("Order instrument does not match this book");
    }

    ordersById_[order->getId()] = order;

    if (order->getSide() == Side::BUY) {
        bids_[order->getPrice()].push_back(order);
    } else {
        asks_[order->getPrice()].push_back(order);
    }
}

bool OrderBook::removeOrder(const std::string& orderId) {
    auto it = ordersById_.find(orderId);
    if (it == ordersById_.end()) {
        return false;
    }

    auto order = it->second;
    double price = order->getPrice();

    auto eraseFromLevel = [&](auto& priceMap) {
        auto levelIt = priceMap.find(price);
        if (levelIt == priceMap.end()) {
            return;
        }
        auto& level = levelIt->second;
        for (auto orderIt = level.begin(); orderIt != level.end(); ++orderIt) {
            if ((*orderIt)->getId() == orderId) {
                level.erase(orderIt);
                break;
            }
        }
        if (level.empty()) {
            priceMap.erase(levelIt);
        }
    };

    if (order->getSide() == Side::BUY) {
        eraseFromLevel(bids_);
    } else {
        eraseFromLevel(asks_);
    }

    ordersById_.erase(it);
    return true;
}

std::optional<double> OrderBook::getBestBid() const {
    if (bids_.empty()) {
        return std::nullopt;
    }
    return bids_.begin()->first;
}

std::optional<double> OrderBook::getBestAsk() const {
    if (asks_.empty()) {
        return std::nullopt;
    }
    return asks_.begin()->first;
}

size_t OrderBook::getBidLevelCount() const { return bids_.size(); }
size_t OrderBook::getAskLevelCount() const { return asks_.size(); }
const std::string& OrderBook::getInstrumentSymbol() const { return instrumentSymbol_; }

} // namespace engine