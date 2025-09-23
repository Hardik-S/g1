# SOLID Principles — Coding Agent Guide

Follow these principles when generating or refactoring code.

---

## 1. SRP (Single Responsibility Principle)
- Each class/module has **one reason to change**.
- Do not mix business logic, persistence, and communication in the same class.

---

## 2. OCP (Open/Closed Principle)
- Entities are **open for extension**, **closed for modification**.
- Add new behavior via interfaces/abstractions or composition.
- Avoid `switch`/`if-else` branches on types for core logic.

---

## 3. LSP (Liskov Substitution Principle)
- Subtypes must honor base contracts.
- Do not override methods to throw or weaken guarantees.
- Model capabilities via interfaces (e.g., `IFlyable`) instead of assuming taxonomy.

---

## 4. ISP (Interface Segregation Principle)
- Prefer **small, role-specific interfaces**.
- Clients should depend only on methods they use.
- Avoid “fat” interfaces that force no-op or error implementations.

---

## 5. DIP (Dependency Inversion Principle)
- High-level modules depend on abstractions, not details.
- Abstractions should not depend on details; details depend on abstractions.
- Use constructor injection to supply dependencies.

---

## Summary
- **SRP → Cohesion**
- **OCP → Extensibility**
- **LSP → Safe Substitution**
- **ISP → Lean Interfaces**
- **DIP → Dependency on Abstractions**
