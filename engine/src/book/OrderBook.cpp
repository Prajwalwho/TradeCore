#include "book/OrderBook.hpp"
#include <stdexcept>
#include <algorithm>

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


std::vector<Trade> OrderBook::submitOrder(std::shared_ptr<Order> order) {
    if (!order) {
        throw std::invalid_argument("Cannot submit null order");
    }
    if (order->getInstrumentSymbol() != instrumentSymbol_) {
        throw std::invalid_argument("Order instrument does not match this book");
    }

    std::vector<Trade> trades;

    if (order->getSide() == Side::BUY) {
        while (order->getRemainingQuantity() > 0 && !asks_.empty()) {
            auto bestAskIt = asks_.begin();
            double bestAskPrice = bestAskIt->first;

            if (order->getType() == OrderType::LIMIT && order->getPrice() < bestAskPrice) {
                break; // best ask is above what the buyer is willing to pay
            }

            auto& level = bestAskIt->second;
            auto restingOrder = level.front();

            int tradeQty = std::min(order->getRemainingQuantity(), restingOrder->getRemainingQuantity());
            double tradePrice = bestAskPrice;

            order->fill(tradeQty);
            restingOrder->fill(tradeQty);

            Trade trade;
            trade.id = order->getId() + "-" + restingOrder->getId();
            trade.buyOrderId = order->getId();
            trade.sellOrderId = restingOrder->getId();
            trade.instrumentSymbol = instrumentSymbol_;
            trade.price = tradePrice;
            trade.quantity = tradeQty;
            trade.executedAt = std::chrono::system_clock::now();
            trades.push_back(trade);

            if (restingOrder->getRemainingQuantity() == 0) {
                level.pop_front();
                ordersById_.erase(restingOrder->getId());
                if (level.empty()) {
                    asks_.erase(bestAskIt);
                }
            }
        }

        if (order->getRemainingQuantity() > 0) {
            if (order->getType() == OrderType::LIMIT) {
                addOrder(order);
            } else {
                order->reject();
            }
        }
    } else {
        while (order->getRemainingQuantity() > 0 && !bids_.empty()) {
            auto bestBidIt = bids_.begin();
            double bestBidPrice = bestBidIt->first;

            if (order->getType() == OrderType::LIMIT && order->getPrice() > bestBidPrice) {
                break; // best bid is below what the seller will accept
            }

            auto& level = bestBidIt->second;
            auto restingOrder = level.front();

            int tradeQty = std::min(order->getRemainingQuantity(), restingOrder->getRemainingQuantity());
            double tradePrice = bestBidPrice;

            order->fill(tradeQty);
            restingOrder->fill(tradeQty);

            Trade trade;
            trade.id = restingOrder->getId() + "-" + order->getId();
            trade.buyOrderId = restingOrder->getId();
            trade.sellOrderId = order->getId();
            trade.instrumentSymbol = instrumentSymbol_;
            trade.price = tradePrice;
            trade.quantity = tradeQty;
            trade.executedAt = std::chrono::system_clock::now();
            trades.push_back(trade);

            if (restingOrder->getRemainingQuantity() == 0) {
                level.pop_front();
                ordersById_.erase(restingOrder->getId());
                if (level.empty()) {
                    bids_.erase(bestBidIt);
                }
            }
        }

        if (order->getRemainingQuantity() > 0) {
            if (order->getType() == OrderType::LIMIT) {
                addOrder(order);
            } else {
                order->reject();
            }
        }
    }

    return trades;
}
} // namespace engine