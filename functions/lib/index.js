"use strict";
/**
 * Firebase Cloud Functions for Focus Notebook AI Processing
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTrackedTickerPrices = exports.updateTrackedTickers = exports.revertThoughtProcessing = exports.reprocessThought = exports.manualProcessThought = exports.processNewThought = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Import cloud functions
const processThought_1 = require("./processThought");
Object.defineProperty(exports, "processNewThought", { enumerable: true, get: function () { return processThought_1.processNewThought; } });
Object.defineProperty(exports, "manualProcessThought", { enumerable: true, get: function () { return processThought_1.manualProcessThought; } });
Object.defineProperty(exports, "reprocessThought", { enumerable: true, get: function () { return processThought_1.reprocessThought; } });
Object.defineProperty(exports, "revertThoughtProcessing", { enumerable: true, get: function () { return processThought_1.revertThoughtProcessing; } });
const marketData_1 = require("./marketData");
Object.defineProperty(exports, "refreshTrackedTickerPrices", { enumerable: true, get: function () { return marketData_1.refreshTrackedTickerPrices; } });
Object.defineProperty(exports, "updateTrackedTickers", { enumerable: true, get: function () { return marketData_1.updateTrackedTickers; } });
//# sourceMappingURL=index.js.map