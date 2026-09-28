#include "book/OrderBook.hpp"
#include <stdexcept>
#include <algorithm>

namespace engine {

OrderBook::OrderBook(std::string instrumentSymbol)
    : instrumentSymbol_(std::move(instrumentSymbol)) {}

void OrderBook::setEventListener(EventListener listener) {
    eventListener_ = std::move(listener);
}

void OrderBook::emit(const EngineEvent& event) const {
    if (eventListener_) {
        eventListener_(event);
    }
}

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

    emit({EventType::ORDER_RESTED, order->getId(), std::nullopt});
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

CancelResult OrderBook::cancelOrder(const std::string& orderId) {
    auto it = ordersById_.find(orderId);
    if (it == ordersById_.end()) {
        return CancelResult::NOT_FOUND;
    }

    auto order = it->second;   // copy the pointer: removeOrder erases the map entry
    order->cancel();           // status -> CANCELLED (keeps any filled quantity)
    removeOrder(orderId);

    emit({EventType::ORDER_CANCELLED, orderId, std::nullopt});
    return CancelResult::CANCELLED;
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

template <typename OppositeMap>
void OrderBook::matchAgainst(OppositeMap& oppositeSide,
                             const std::shared_ptr<Order>& order,
                             std::vector<Trade>& trades) {
    const bool isBuy = order->getSide() == Side::BUY;

    while (order->getRemainingQuantity() > 0 && !oppositeSide.empty()) {
        auto bestIt = oppositeSide.begin();
        const double bestPrice = bestIt->first;

        if (order->getPrice() > 0.0) {
            const bool crosses = isBuy ? order->getPrice() >= bestPrice
                                       : order->getPrice() <= bestPrice;
            if (!crosses) {
                break;   // best opposite price is worse than this order will accept
            }
        }

        auto& level = bestIt->second;
        auto restingOrder = level.front();   // copy: the deque entry may be popped below

        const int tradeQty = std::min(order->getRemainingQuantity(),
                                      restingOrder->getRemainingQuantity());

        order->fill(tradeQty);
        restingOrder->fill(tradeQty);

        const Order& buyOrder = isBuy ? *order : *restingOrder;
        const Order& sellOrder = isBuy ? *restingOrder : *order;

        Trade trade;
        trade.id = buyOrder.getId() + "-" + sellOrder.getId();
        trade.buyOrderId = buyOrder.getId();
        trade.sellOrderId = sellOrder.getId();
        trade.instrumentSymbol = instrumentSymbol_;
        trade.price = bestPrice;   // the resting order's price
        trade.quantity = tradeQty;
        trade.executedAt = std::chrono::system_clock::now();
        trades.push_back(trade);
        emit({EventType::TRADE_EXECUTED, "", trade});

        if (restingOrder->getRemainingQuantity() == 0) {
            level.pop_front();
            ordersById_.erase(restingOrder->getId());
            if (level.empty()) {
                oppositeSide.erase(bestIt);
            }
            emit({EventType::ORDER_FILLED, restingOrder->getId(), std::nullopt});
        }
    }
}

std::vector<Trade> OrderBook::submitOrder(std::shared_ptr<Order> order) {
    if (!order) {
        throw std::invalid_argument("Cannot submit null order");
    }
    if (order->getInstrumentSymbol() != instrumentSymbol_) {
        throw std::invalid_argument("Order instrument does not match this book");
    }

    std::vector<Trade> trades;

    if (order->getSide() == Side::BUY) {
        matchAgainst(asks_, order, trades);
    } else {
        matchAgainst(bids_, order, trades);
    }

    // Whatever is left over: limit orders rest, market orders never rest.
    if (order->getRemainingQuantity() > 0) {
        if (order->getType() == OrderType::LIMIT) {
            addOrder(order);
        } else if (order->getFilledQuantity() == 0) {
            order->reject();
        }
        // else: market order partially filled, leave it PARTIALLY_FILLED
    }

    // Final status of the incoming order (resting orders are reported inside matchAgainst)
    if (order->getStatus() == OrderStatus::FILLED) {
        emit({EventType::ORDER_FILLED, order->getId(), std::nullopt});
    } else if (order->getStatus() == OrderStatus::REJECTED) {
        emit({EventType::ORDER_REJECTED, order->getId(), std::nullopt});
    }

    return trades;
}

} // namespace engine