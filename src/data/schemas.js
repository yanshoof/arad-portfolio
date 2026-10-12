// Field types for each data table (from the original Base44 schemas).
// Used for CSV import type coercion and server-side validation of table names.
export const SCHEMAS = {
 "AlertHistory": {
  "alert_id": {
   "type": "string"
  },
  "symbol": {
   "type": "string"
  },
  "condition_type": {
   "type": "string"
  },
  "target_value": {
   "type": "number"
  },
  "triggered_price": {
   "type": "number"
  },
  "triggered_at": {
   "type": "string"
  },
  "category": {
   "type": "string"
  },
  "notes": {
   "type": "string"
  }
 },
 "ClosedPosition": {
  "symbol": {
   "type": "string"
  },
  "purchase_price": {
   "type": "number"
  },
  "purchase_date": {
   "type": "string"
  },
  "quantity": {
   "type": "number"
  },
  "sell_price": {
   "type": "number"
  },
  "sell_date": {
   "type": "string"
  }
 },
 "DailyStockSnapshot": {
  "symbol": {
   "type": "string"
  },
  "close_price": {
   "type": "number"
  },
  "snapshot_date": {
   "type": "string"
  }
 },
 "EEClosedPosition": {
  "symbol": {
   "type": "string"
  },
  "position_type": {
   "type": "string"
  },
  "option_type": {
   "type": "string"
  },
  "strike": {
   "type": "number"
  },
  "expiration_date": {
   "type": "string"
  },
  "purchase_price": {
   "type": "number"
  },
  "purchase_date": {
   "type": "string"
  },
  "quantity": {
   "type": "number"
  },
  "sell_price": {
   "type": "number"
  },
  "sell_date": {
   "type": "string"
  }
 },
 "EEOpenPosition": {
  "symbol": {
   "type": "string"
  },
  "position_type": {
   "type": "string"
  },
  "option_type": {
   "type": "string"
  },
  "strike": {
   "type": "number"
  },
  "expiration_date": {
   "type": "string"
  },
  "purchase_price": {
   "type": "number"
  },
  "purchase_date": {
   "type": "string"
  },
  "quantity": {
   "type": "number"
  }
 },
 "JournalEntry": {
  "date": {
   "type": "string"
  },
  "day_of_week": {
   "type": "string"
  },
  "time": {
   "type": "string"
  },
  "ticker": {
   "type": "string"
  },
  "trade_category": {
   "type": "string"
  },
  "trade_category_other": {
   "type": "string"
  },
  "entry_price": {
   "type": "number"
  },
  "planned_holding_days": {
   "type": "number"
  },
  "conviction_score": {
   "type": "number"
  },
  "entry_reason": {
   "type": "string"
  },
  "expectations": {
   "type": "string"
  },
  "invalidation": {
   "type": "string"
  },
  "setup": {
   "type": "string"
  },
  "macro_context": {
   "type": "string"
  },
  "market_mood": {
   "type": "string"
  },
  "emotional_state": {
   "type": "string"
  },
  "edge_source": {
   "type": "string"
  },
  "alternative_plays": {
   "type": "string"
  },
  "vix_today": {
   "type": "number"
  },
  "sizing_rationale": {
   "type": "string"
  },
  "expected_probability": {
   "type": "number"
  },
  "expected_profit": {
   "type": "number"
  },
  "post_trade_analysis": {
   "type": "string"
  }
 },
 "OpenPosition": {
  "symbol": {
   "type": "string"
  },
  "purchase_price": {
   "type": "number"
  },
  "purchase_date": {
   "type": "string"
  },
  "quantity": {
   "type": "number"
  }
 },
 "PortfolioSnapshot": {
  "snapshot_date": {
   "type": "string"
  },
  "label": {
   "type": "string"
  },
  "positions": {
   "type": "array"
  },
  "show_in_what_if": {
   "type": "boolean",
   "default": false
  }
 },
 "PositionLog": {
  "action": {
   "type": "string"
  },
  "symbol": {
   "type": "string"
  },
  "quantity": {
   "type": "number"
  },
  "purchase_price": {
   "type": "number"
  },
  "purchase_date": {
   "type": "string"
  },
  "sell_price": {
   "type": "number"
  },
  "sell_date": {
   "type": "string"
  },
  "notes": {
   "type": "string"
  }
 },
 "PrevCloseCache": {
  "symbol": {
   "type": "string"
  },
  "market_date": {
   "type": "string"
  },
  "prev_close": {
   "type": "number"
  }
 },
 "StockAlert": {
  "symbol": {
   "type": "string"
  },
  "condition_type": {
   "type": "string"
  },
  "target_value": {
   "type": "number"
  },
  "is_active": {
   "type": "boolean",
   "default": true
  },
  "triggered": {
   "type": "boolean",
   "default": false
  },
  "triggered_at": {
   "type": "string"
  },
  "triggered_price": {
   "type": "number"
  },
  "notes": {
   "type": "string"
  },
  "is_recurring": {
   "type": "boolean",
   "default": false
  },
  "recurrence_frequency": {
   "type": "string"
  },
  "category": {
   "type": "string",
   "default": "General"
  },
  "email_notification": {
   "type": "boolean",
   "default": true
  },
  "last_checked": {
   "type": "string"
  }
 },
 "TVRecommendation": {
  "title": {
   "type": "string"
  },
  "comments": {
   "type": "string"
  }
 },
 "User": {
  "trading_notes": {
   "type": "string"
  },
  "change_log": {
   "type": "string"
  },
  "ideas_thoughts": {
   "type": "string"
  }
 },
 "UserInvestmentProfile": {
  "risk_tolerance": {
   "type": "string",
   "default": "Moderate"
  },
  "investment_goals": {
   "type": "string"
  },
  "time_horizon": {
   "type": "string",
   "default": "Long-term (5+ years)"
  },
  "target_annual_return": {
   "type": "number"
  },
  "max_position_size": {
   "type": "number"
  },
  "preferred_sectors": {
   "type": "string"
  },
  "excluded_sectors": {
   "type": "string"
  }
 },
 "WatchListItem": {
  "symbol": {
   "type": "string"
  },
  "date_added": {
   "type": "string"
  },
  "category": {
   "type": "string",
   "default": "Open"
  }
 }
};

export const ENTITY_NAMES = Object.keys(SCHEMAS).filter((n) => n !== 'User');
