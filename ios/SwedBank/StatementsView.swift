//
//  StatementsView.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

struct StatementsView: View {
    private let statements: [StatementPeriod] = [
        StatementPeriod(id: "1", month: "June 2026", opening: 92_120.50, closing: 125_420.50, transactions: 18),
        StatementPeriod(id: "2", month: "May 2026", opening: 87_540.00, closing: 92_120.50, transactions: 22),
        StatementPeriod(id: "3", month: "April 2026", opening: 78_320.75, closing: 87_540.00, transactions: 15),
        StatementPeriod(id: "4", month: "March 2026", opening: 71_200.00, closing: 78_320.75, transactions: 19),
        StatementPeriod(id: "5", month: "February 2026", opening: 65_840.00, closing: 71_200.00, transactions: 14),
        StatementPeriod(id: "6", month: "January 2026", opening: 60_000.00, closing: 65_840.00, transactions: 16),
    ]

    var body: some View {
        List(statements) { statement in
            StatementRow(statement: statement)
                .listRowInsets(EdgeInsets(top: 6, leading: 18, bottom: 6, trailing: 18))
                .listRowSeparator(.hidden)
        }
        .listStyle(.plain)
        .background(AppTheme.surfaceSecondary)
        .scrollContentBackground(.hidden)
        .navigationTitle("Statements")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct StatementRow: View {
    let statement: StatementPeriod

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "doc.text.fill")
                .font(.system(size: 18))
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(AppTheme.navy)
                .clipShape(.rect(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(statement.month)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Text("\(statement.transactions) transactions")
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.textSecondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(SEKFormatter.currency(statement.closing))
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(AppTheme.textPrimary)
                Image(systemName: "arrow.down.to.line")
                    .font(.system(size: 12))
                    .foregroundStyle(AppTheme.navy)
            }
        }
        .padding(14)
        .background(.white)
        .clipShape(.rect(cornerRadius: AppTheme.smallCorner))
        .shadow(color: AppTheme.shadowColor.opacity(0.08), radius: 6, y: 3)
    }
}

struct StatementPeriod: Identifiable {
    let id: String
    let month: String
    let opening: Double
    let closing: Double
    let transactions: Int
}
