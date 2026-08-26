/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, Wallet, CreditCard, Activity, Loader } from "lucide-react";
import { formatCurrency, formatSOL, formatUSDC } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useMerchantStore } from "@/lib/store/useMerchantStore";
import { useTransactions } from "@/lib/services/useTransactions";
import { useBackendConfig } from "@/lib/services/useBackendConfig";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { config } from "@/lib/config";

const connection = new Connection(config.rpcEndpoint, "confirmed");

export function StatsCards() {
  const {
    totalPaymentsReceived,
    totalVolume,
    walletAddress,
    isActive,
    paymentToken,
  } = useMerchantStore();
  const { transactions } = useTransactions();
  const { config: backendConfig } = useBackendConfig();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  useEffect(() => {
    // El mint de USDC en uso es el que configuró el backend (en devnet es uno
    // propio, no el de lib/config.ts) — sin esto se consultaba el balance de
    // un token que la wallet del comercio nunca tuvo.
    if (!walletAddress || (paymentToken === "usdc" && !backendConfig?.paymentTokenMint)) {
      setBalance(null);
      return;
    }

    setBalanceLoading(true);

    const fetchBalance = async () => {
      try {
        const pubkey = new PublicKey(walletAddress);
        if (paymentToken === "sol") {
          const lamports = await connection.getBalance(pubkey);
          setBalance(lamports / 1_000_000_000);
        } else {
          const mint = new PublicKey(backendConfig!.paymentTokenMint!);
          const ata = await getAssociatedTokenAddress(mint, pubkey);
          const accountInfo = await connection.getTokenAccountBalance(ata);
          setBalance(accountInfo.value.uiAmount);
        }
      } catch {
        setBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
  }, [walletAddress, paymentToken, backendConfig]);

  // Merchant.totalVolume/totalPaymentsReceived (Postgres) se pisan a 0 cada
  // vez que useMerchantSync vuelve a sincronizar (nadie los actualiza ahí
  // todavía), y eso resetea el contador local de incrementPayments() a mitad
  // de camino: con el orden viejo, "Total Revenue" terminaba mostrando solo
  // el último cobro después de un refresh en vez de la suma real. El
  // historial de transacciones (Postgres vía /api/payments) es la fuente
  // confiable — se prioriza siempre que ya haya datos cargados.
  const totalRevenue = transactions.length
    ? transactions.reduce((sum, tx) => sum + tx.amount, 0)
    : totalVolume;
  const paymentCount = transactions.length || totalPaymentsReceived;

  const walletConnected = !!walletAddress;
  const balanceDisplay = walletConnected
    ? balance !== null
      ? paymentToken === "sol"
        ? formatSOL(Math.round(balance * 1_000_000_000))
        : formatUSDC(balance)
      : balanceLoading
        ? "—"
        : "0.00"
    : "0.00";

  const balanceChange = walletConnected
    ? balanceLoading
      ? "Checking balance..."
      : balance !== null
        ? "Available"
        : "Balance unavailable"
    : "Complete setup to view your balance";

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      change: `${paymentCount} payments`,
      icon: DollarSign,
      positive: true,
    },
    {
      label: "Payments Received",
      value: String(paymentCount),
      change: "All time",
      icon: CreditCard,
      positive: true,
    },
    {
      label: "Available Balance",
      value: balanceDisplay,
      change: balanceChange,
      icon: balanceLoading ? Loader : Wallet,
      positive: !!walletAddress,
    },
    {
      label: "POS Status",
      value: isActive ? "Active" : "Inactive",
      change: isActive ? "Online" : "Offline",
      icon: Activity,
      positive: isActive,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-lg p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-on-surface-variant font-heading uppercase tracking-wider">
              {stat.label}
            </span>
            <div className="w-8 h-8 rounded-lg bg-electric-purple/10 flex items-center justify-center">
              <stat.icon className="w-4 h-4 text-electric-purple" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-heading font-semibold text-on-surface mb-1">
            {stat.value}
          </p>
          <span
            className={cn(
              "text-xs font-heading",
              stat.positive ? "text-success" : "text-error",
            )}
          >
            {stat.change}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
