import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { ProsperitySymbol } from '../../models.ts';
import { useStore } from '../../store.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { formatNumber } from '../../utils/format.ts';
import { Chart } from './Chart.tsx';

export interface ProductPriceChartProps {
  symbol: ProsperitySymbol;
}

export function ProductPriceChart({ symbol }: ProductPriceChartProps): ReactNode {
  const algorithm = useStore(state => state.algorithm)!;
  const tradeStarIcon =
    "url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%23ffd43b' stroke='%238a6d00' stroke-width='1.5' d='m12 2 2.9 6.2 6.8.8-5 4.7 1.3 6.7-6-3.3-6 3.3 1.3-6.7-5-4.7 6.8-.8z'/%3E%3C/svg%3E)";
  const submissionBuyTradeStarIcon =
    "url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24'%3E%3Cpath fill='%232289ff' stroke='%230b5394' stroke-width='1.5' d='m12 2 2.9 6.2 6.8.8-5 4.7 1.3 6.7-6-3.3-6 3.3 1.3-6.7-5-4.7 6.8-.8z'/%3E%3C/svg%3E)";

  const series: Highcharts.SeriesOptionsType[] = [
    { type: 'line', name: 'Bid 3', color: getBidColor(0.5), marker: { symbol: 'square' }, data: [] },
    { type: 'line', name: 'Bid 2', color: getBidColor(0.75), marker: { symbol: 'circle' }, data: [] },
    { type: 'line', name: 'Bid 1', color: getBidColor(1.0), marker: { symbol: 'triangle' }, data: [] },
    { type: 'line', name: 'Mid price', color: 'gray', dashStyle: 'Dash', marker: { symbol: 'diamond' }, data: [] },
    { type: 'line', name: 'Ask 1', color: getAskColor(1.0), marker: { symbol: 'triangle-down' }, data: [] },
    { type: 'line', name: 'Ask 2', color: getAskColor(0.75), marker: { symbol: 'circle' }, data: [] },
    { type: 'line', name: 'Ask 3', color: getAskColor(0.5), marker: { symbol: 'square' }, data: [] },
    {
      type: 'scatter',
      name: 'Trades',
      color: '#d4a017',
      marker: {
        symbol: tradeStarIcon,
        radius: 7,
      },
      tooltip: {
        pointFormatter: function () {
          const trade = (this.options as any).custom;
          return (
            `<span style="color:${this.color}">\u25CF</span> <b>Trade</b><br/>` +
            `Price: <b>${formatNumber(this.y as number)}</b><br/>` +
            `Quantity: <b>${formatNumber(trade.quantity)}</b><br/>` +
            `Buyer: <b>${trade.buyer || '-'}</b><br/>` +
            `Seller: <b>${trade.seller || '-'}</b><br/>` +
            `Timestamp: <b>${formatNumber(trade.timestamp)}</b><br/>`
          );
        },
      },
      data: [],
    },
  ];

  for (const row of algorithm.activityLogs) {
    if (row.product !== symbol) {
      continue;
    }

    for (let i = 0; i < row.bidPrices.length; i++) {
      (series[2 - i] as any).data.push([row.timestamp, row.bidPrices[i]]);
    }

    (series[3] as any).data.push([row.timestamp, row.midPrice]);

    for (let i = 0; i < row.askPrices.length; i++) {
      (series[i + 4] as any).data.push([row.timestamp, row.askPrices[i]]);
    }
  }

  for (const trade of algorithm.tradeHistory) {
    if (trade.symbol !== symbol) {
      continue;
    }

    (series[7] as any).data.push({
      x: trade.timestamp,
      y: trade.price,
      marker: {
        symbol: trade.buyer === 'SUBMISSION' ? submissionBuyTradeStarIcon : tradeStarIcon,
      },
      custom: {
        quantity: trade.quantity,
        buyer: trade.buyer,
        seller: trade.seller,
        timestamp: trade.timestamp,
      },
    });
  }

  return <Chart title={`${symbol} - Price`} series={series} />;
}
