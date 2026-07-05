//
//  SEKFormatter.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import Foundation

/// Swedish Krona formatting helpers.
enum SEKFormatter {
    private static let currencyFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = "SEK"
        f.currencySymbol = "kr"
        f.locale = Locale(identifier: "sv_SE")
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = 2
        return f
    }()

    private static let numberFormatter: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        f.locale = Locale(identifier: "sv_SE")
        f.minimumFractionDigits = 0
        f.maximumFractionDigits = 2
        f.groupingSeparator = " "
        f.decimalSeparator = ","
        return f
    }()

    /// "125 420,50 kr"
    static func currency(_ value: Double) -> String {
        currencyFormatter.string(from: NSNumber(value: value)) ?? "0 kr"
    }

    /// "125 420,50"
    static func number(_ value: Double) -> String {
        numberFormatter.string(from: NSNumber(value: value)) ?? "0"
    }

    /// "SE45 5000 0000 0583 9825 7466"
    static func iban(_ iban: String) -> String {
        let clean = iban.replacingOccurrences(of: " ", with: "").uppercased()
        var result = ""
        for (index, char) in clean.enumerated() {
            if index > 0 && index % 4 == 0 {
                result.append(" ")
            }
            result.append(char)
        }
        return result
    }

    /// "SE45 •••• •••• •••• 5746"
    static func maskedIBAN(_ iban: String) -> String {
        let clean = iban.replacingOccurrences(of: " ", with: "").uppercased()
        guard clean.count >= 8 else { return clean }
        let head = String(clean.prefix(4))
        let tail = String(clean.suffix(4))
        return "\(head) •••• •••• •••• \(tail)"
    }
}
