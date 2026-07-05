//
//  AppTheme.swift
//  SwedBank
//
//  Created by Rork on July 5, 2026.
//

import SwiftUI

/// SwedBank — Scandinavian minimal banking palette.
/// Navy blue primary, muted gold accent, white background.
enum AppTheme {
    static let navy = Color(hex: "0F2A5C")
    static let navyDark = Color(hex: "0A1F45")
    static let navyMid = Color(hex: "1E4280")
    static let navySoft = Color(hex: "E8EEF6")
    static let navyBorder = Color(hex: "E3E8F0")

    static let gold = Color(hex: "C9A961")
    static let goldSoft = Color(hex: "F5EFDE")

    static let textPrimary = Color(hex: "0F1B33")
    static let textSecondary = Color(hex: "5B6B82")
    static let textMuted = Color(hex: "9FB0C7")

    static let background = Color.white
    static let surface = Color.white
    static let surfaceSecondary = Color(hex: "F4F7FB")

    static let success = Color(hex: "1F8A4C")
    static let danger = Color(hex: "D4302A")
    static let warning = Color(hex: "C98A1A")

    static let shadowColor = Color(hex: "A8B8CC")

    static let cardCorner: CGFloat = 20
    static let smallCorner: CGFloat = 14
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 3:
            (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: 1
        )
    }
}
