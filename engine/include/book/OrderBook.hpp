#pragma once

#include <map>
#include <deque>
#include <unordered_map>
#include <memory>
#include <functional>
#include <optional>
#include <string>
#include <vector>
#include "order/Order.hpp"
#include "execution/Trade.hpp"
#include "execution/Event.hpp"

namespace engine {

enum class CancelResult {
    CANCELLED,
    NOT_FOUND
};

class OrderBook {
public:
    // Listeners must NOT call back into the book from inside the callback.
    using EventListener = std::function<void(const EngineEvent&)>;

    explicit OrderBook(std::string instrumentSymbol);

    void setEventListener(EventListener listener);

    void addOrder(std::shared_ptr<Order> order);
    bool removeOrder(const std::string& orderId);
    std::vector<Trade> submitOrder(std::shared_ptr<Order> order);
    CancelResult cancelOrder(const std::string& orderId);

    std::optional<double> getBestBid() const;
    std::optional<double> getBestAsk() const;

    size_t getBidLevelCount() const;
    size_t getAskLevelCount() const;

    const std::string& getInstrumentSymbol() const;

private:
    using PriceLevel = std::deque<std::shared_ptr<Order>>;
    using BidMap = std::map<double, PriceLevel, std::greater<double>>;
    using AskMap = std::map<double, PriceLevel>;

    void emit(const EngineEvent& event) const;

    std::string instrumentSymbol_;
    BidMap bids_;
    AskMap asks_;
    std::unordered_map<std::string, std::shared_ptr<Order>> ordersById_;
    EventListener eventListener_;
};

} // namespace engine