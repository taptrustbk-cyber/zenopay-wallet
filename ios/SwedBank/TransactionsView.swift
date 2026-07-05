//
//  TransactionsView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct TransactionsView: View {
    @State private var filter: TransactionFilter = .all

    private let transactions = BankModel.shared.transactions

    private var filtered: [DemoTransaction] {
        switch filter {
        case .all: return transactions
        case .incoming: return transactions.filter { $0.amount > 0 }
        case .outgoing: return transactions.filter { $0.amount < 0 }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            filterBar
            List(filtered) { tx in
                TransactionRow(tx: tx)
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
            }
            .listStyle(.plain)
            .background(AppTheme.surfaceSecondary)
        }
        .background(AppTheme.surfaceSecondary)
        .navigationTitle("Transactions")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var filterBar: some View {
        HStack(spacing: 10) {
            ForEach(TransactionFilter.allCases) { f in
                Button {
                    withAnimation(.spring(response: 0.3)) { filter = f }
                } label: {
                    Text(f.label)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(filter == f ? .white : AppTheme.textSecondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background {
                            if filter == f {
                                Capsule().fill(AppTheme.navy)
                            } else {
                                Capsule().fill(AppTheme.navySoft)
                            }
                        }
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
    }
}

enum TransactionFilter: String, CaseIterable, Identifiable {
    case all, incoming, outgoing
    var id: String { rawValue }
    var label: String {
        switch self {
        case .all: return "All"
        case .incoming: return "Incoming"
        case .outgoing: return "Outgoing"
        }
    }
}
