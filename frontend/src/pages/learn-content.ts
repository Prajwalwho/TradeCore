export const LESSONS: { title: string; body: string }[] = [
  {
    title: "Market order vs limit order",
    body:
      "A market order buys or sells right away at the best price available. A limit order sets the price you are willing to accept: a buy limit fills only at that price or lower, a sell limit only at that price or higher. If the market never reaches your price, a limit order stays open until you cancel it.",
  },
  {
    title: "Bid, ask and spread",
    body:
      "The bid is the highest price a buyer is offering, and the ask is the lowest price a seller wants. The gap between them is the spread. When you buy at market you pay the ask, and when you sell at market you get the bid, so buying and selling straight away costs you the spread. In this app the market maker quotes a small spread around the live price.",
  },
  {
    title: "Average cost",
    body:
      "If you buy the same stock several times, your average cost is the total you paid divided by the number of shares. Buy 10 at 100 and 10 at 110, and your average cost is 105. Profit and loss are measured against this number.",
  },
  {
    title: "Realized vs unrealized P&L",
    body:
      "Unrealized P&L is the profit or loss on shares you still hold, based on today's price. It changes all day. Realized P&L is locked in when you sell. Only realized P&L counts in your Profile reports.",
  },
  {
    title: "What is an AMO order?",
    body:
      "AMO means After Market Order. When a market is closed you can still queue an order, and it is sent when the market opens. Funds and shares are checked at that moment, so an AMO can fail if you no longer have enough cash or shares by then.",
  },
  {
    title: "Square off",
    body:
      "Squaring off means closing a position by selling what you bought, so you hold nothing and your profit or loss becomes realized. The Square off button on the Trades page sells your whole position at the market price.",
  },
  {
    title: "Used margin",
    body:
      "In this app, used margin is the cash set aside for your open limit buy orders. It is still yours, but you cannot spend it on something else until the order fills or you cancel it.",
  },
  {
    title: "What paper trading cannot teach",
    body:
      "Paper trading is safe practice, but it hides some things. Real orders can fill at worse prices when the market moves fast, large orders move the price, and money at risk feels very different. Prices here are delayed and unofficial, so treat results as practice, not as proof a strategy works.",
  },
];