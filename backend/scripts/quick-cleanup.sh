#!/bin/bash

# Quick Cleanup Script for SecureWatch Development
# ================================================
# 
# This script provides quick cleanup operations for common development scenarios.

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Function to show help
show_help() {
    echo "SecureWatch Quick Cleanup Script"
    echo "==============================="
    echo ""
    echo "Usage: ./scripts/quick-cleanup.sh [option]"
    echo ""
    echo "Options:"
    echo "  preview    Show what would be cleaned (dry-run)"
    echo "  all        Clean all synced data and violations"
    echo "  violations Clean only violations and incidents"
    echo "  emails     Clean only email communications"
    echo "  employees  Clean only synced employees"
    echo "  help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/quick-cleanup.sh preview"
    echo "  ./scripts/quick-cleanup.sh all"
    echo "  ./scripts/quick-cleanup.sh violations"
    echo ""
}

# Function to run cleanup with specific options
run_cleanup() {
    local mode="$1"
    
    print_status "🧹 Running SecureWatch cleanup..."
    
    case "$mode" in
        "preview")
            node scripts/cleanup-test-data.js --dry-run --verbose
            ;;
        "all")
            print_warning "⚠️  This will delete ALL synced data and generated violations!"
            read -p "Are you sure? (yes/no): " confirm
            if [[ "$confirm" == "yes" || "$confirm" == "y" ]]; then
                node scripts/cleanup-test-data.js --confirm
            else
                print_error "❌ Cleanup cancelled"
                exit 1
            fi
            ;;
        "violations")
            print_status "🔧 Cleaning only violations and incidents..."
            echo "This feature requires the main cleanup script for now."
            echo "Use: node scripts/cleanup-test-data.js --help for full options"
            ;;
        "emails")
            print_status "📧 Cleaning only email communications..."
            echo "This feature requires the main cleanup script for now."
            echo "Use: node scripts/cleanup-test-data.js --help for full options"
            ;;
        "employees")
            print_status "👥 Cleaning only synced employees..."
            echo "This feature requires the main cleanup script for now."
            echo "Use: node scripts/cleanup-test-data.js --help for full options"
            ;;
        *)
            print_error "❌ Unknown option: $mode"
            show_help
            exit 1
            ;;
    esac
}

# Main script logic
main() {
    # Check if we're in the backend directory
    if [[ ! -f "scripts/cleanup-test-data.js" ]]; then
        print_error "❌ Please run this script from the backend directory"
        exit 1
    fi

    # Parse command line arguments
    case "${1:-help}" in
        "preview"|"all"|"violations"|"emails"|"employees")
            run_cleanup "$1"
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            print_error "❌ Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 