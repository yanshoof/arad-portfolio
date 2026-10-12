/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AddPosition from './pages/AddPosition';
import Changes from './pages/Changes';
import ClosedPositions from './pages/ClosedPositions';
import Data from './pages/Data';
import EE from './pages/EE';
import EEAddPosition from './pages/EEAddPosition';
import EEClosedPositions from './pages/EEClosedPositions';
import EEJournal from './pages/EEJournal';
import EEOpenPositions from './pages/EEOpenPositions';
import EEStats from './pages/EEStats';
import Home from './pages/Home';
import Indexes from './pages/Indexes';
import Journal from './pages/Journal';
import NewsEarnings from './pages/NewsEarnings';
import Notes from './pages/Notes';
import OpenPositions from './pages/OpenPositions';
import OpenPositions2 from './pages/OpenPositions2';
import Momentum from './pages/Momentum';
import StockPnL from './pages/StockPnL';
import Summary from './pages/Summary';
import TransactionHistory from './pages/TransactionHistory';
import WatchList from './pages/WatchList';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddPosition": AddPosition,
    "Changes": Changes,
    "ClosedPositions": ClosedPositions,
    "Data": Data,
    "EE": EE,
    "EEAddPosition": EEAddPosition,
    "EEClosedPositions": EEClosedPositions,
    "EEJournal": EEJournal,
    "EEOpenPositions": EEOpenPositions,
    "EEStats": EEStats,
    "Home": Home,
    "Indexes": Indexes,
    "Journal": Journal,
    "NewsEarnings": NewsEarnings,
    "Notes": Notes,
    "OpenPositions": OpenPositions,
    "OpenPositions2": OpenPositions2,
    "Momentum": Momentum,
    "StockPnL": StockPnL,
    "Summary": Summary,
    "TransactionHistory": TransactionHistory,
    "WatchList": WatchList,
}

export const pagesConfig = {
    mainPage: "ClosedPositions",
    Pages: PAGES,
    Layout: __Layout,
};