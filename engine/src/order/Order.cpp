#include "order/Order.hpp"
#include <stdexcept>

namespace engine {

Order::Order(std::string id,
             std::string accountId,
             std::string instrumentSymbol,
             Side side,
             OrderType type,
             int quantity,
             double price)
    : id_(std::move(id)),
      accountId_(std::move(accountId)),
      instrumentSymbol_(std::move(instrumentSymbol)),
      side_(side),
      type_(type),
      quantity_(quantity),
      filledQuantity_(0),
      price_(price),
      status_(OrderStatus::PENDING),
      createdAt_(std::chrono::system_clock::now()) {

    if (quantity_ <= 0) {
        throw std::invalid_argument("Order quantity must be positive");
    }

    if (type_ == OrderType::LIMIT && price_ <= 0.0) {
        throw std::invalid_argument("Limit orders must have a positive price");
    }
}

const std::string& Order::getId() const { return id_; }
const std::string& Order::getAccountId() const { return accountId_; }
const std::string& Order::getInstrumentSymbol() const { return instrumentSymbol_; }
Side Order::getSide() const { return side_; }
OrderType Order::getType() const { return type_; }
int Order::getQuantity() const { return quantity_; }
int Order::getFilledQuantity() const { return filledQuantity_; }
int Order::getRemainingQuantity() const { return quantity_ - filledQuantity_; }
double Order::getPrice() const { return price_; }
OrderStatus Order::getStatus() const { return status_; }
std::chrono::system_clock::time_point Order::getCreatedAt() const { return createdAt_; }

void Order::fill(int fillQuantity) {
    if (fillQuantity <= 0) {
        throw std::invalid_argument("Fill quantity must be positive");
    }
    if (fillQuantity > getRemainingQuantity()) {
        throw std::invalid_argument("Fill quantity exceeds remaining quantity");
    }

    filledQuantity_ += fillQuantity;

    if (filledQuantity_ == quantity_) {
        status_ = OrderStatus::FILLED;
    } else {
        status_ = OrderStatus::PARTIALLY_FILLED;
    }
}

void Order::cancel() {
    if (status_ == OrderStatus::FILLED) {
        throw std::runtime_error("Cannot cancel a fully filled order");
    }
    status_ = OrderStatus::CANCELLED;
}

void Order::reject() {
    status_ = OrderStatus::REJECTED;
}

} // namespace engine