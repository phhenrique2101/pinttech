# 📐 PintTech - Medidas DAX Prontas para Power BI

Este guia contém as fórmulas DAX prontas para copiar e colar no Power BI Desktop para gerar seus cartões, gráficos e relatórios gerenciais da cervejaria.

---

## 1. 💰 Vendas e Faturamento Comercial

### Faturamento Bruto (R$)
```dax
Faturamento Total = 
SUM(Fato_Vendas_Pedidos[item_total_price])
```

### Volume Total Vendido (Litros)
```dax
Volume Vendido (Litros) = 
SUM(Fato_Vendas_Pedidos[total_volume_liters])
```

### Quantidade de Pedidos
```dax
Total Pedidos = 
DISTINCTCOUNT(Fato_Vendas_Pedidos[order_id])
```

### Ticket Médio por Pedido (R$)
```dax
Ticket Médio = 
DIVIDE([Faturamento Total], [Total Pedidos], 0)
```

### Preço Médio por Litro Vendido (R$/L)
```dax
Preço Médio / Litro = 
DIVIDE([Faturamento Total], [Volume Vendido (Litros)], 0)
```

### Lucro Bruto Estimado das Vendas (R$)
```dax
Lucro Bruto Comercial = 
SUM(Fato_Vendas_Pedidos[estimated_gross_profit])
```

### Margem Bruta Comercial (%)
```dax
Margem Bruta (%) = 
DIVIDE([Lucro Bruto Comercial], [Faturamento Total], 0)
```

### Total Já Recebido (R$)
```dax
Total Recebido = 
CALCULATE(
    SUM(Fato_Vendas_Pedidos[order_paid_amount]),
    ALLEXCEPT(Fato_Vendas_Pedidos, Fato_Vendas_Pedidos[order_id])
)
```

### Saldo a Receber / Pendente de Clientes (R$)
```dax
Saldo Pendente Clientes = 
CALCULATE(
    SUM(Fato_Vendas_Pedidos[order_remaining_amount]),
    ALLEXCEPT(Fato_Vendas_Pedidos, Fato_Vendas_Pedidos[order_id])
)
```

---

## 2. 🍺 Produção Cervejeira & Rendimento (Brewing)

### Volume Total Brassado (Litros)
```dax
Volume Brassado (Litros) = 
SUM(Fato_Producao_Lotes[effective_volume_liters])
```

### Total de Brassagens / Lotes
```dax
Total Lotes = 
COUNTROWS(Fato_Producao_Lotes)
```

### Custo Total de Produção (R$)
```dax
Custo Total Produção = 
SUM(Fato_Producao_Lotes[total_cost])
```

### Custo Médio por Litro Brassado (R$/L)
```dax
Custo Médio / Litro Produzido = 
DIVIDE([Custo Total Produção], [Volume Brassado (Litros)], 0)
```

### Volume Planejado vs Volume Produzido (%)
```dax
Eficiência Volume (%) = 
DIVIDE(
    SUM(Fato_Producao_Lotes[volume_produced_liters]),
    SUM(Fato_Producao_Lotes[volume_planned_liters]),
    0
)
```

### Teor Alcoólico Médio (ABV Real)
```dax
ABV Médio = 
AVERAGE(Fato_Producao_Lotes[measured_abv])
```

### Amargor Médio Real (IBU)
```dax
IBU Médio = 
AVERAGE(Fato_Producao_Lotes[measured_ibu])
```

---

## 3. 🛢️ Logística, Gestão de Barris & Giro de Ativos

### Total de Barris no Parque (Frota)
```dax
Total Barris Frota = 
COUNTROWS(Fato_Barris_Posicao)
```

### Barris com Clientes (Em Campo)
```dax
Barris em Clientes = 
CALCULATE(
    COUNTROWS(Fato_Barris_Posicao),
    Fato_Barris_Posicao[current_status] = "NO_CLIENTE"
)
```

### Barris Disponíveis para Venda (Câmara Fria)
```dax
Barris Disponíveis Cheios = 
CALCULATE(
    COUNTROWS(Fato_Barris_Posicao),
    Fato_Barris_Posicao[current_status] IN {"EM_ESTOQUE", "ENVASADO"}
)
```

### Barris Sujos / Aguardando Lavagem CIP
```dax
Barris Aguardando Lavagem = 
CALCULATE(
    COUNTROWS(Fato_Barris_Posicao),
    Fato_Barris_Posicao[current_status] = "VAZIO_SUJO"
)
```

### Taxa de Ocupação da Frota em Clientes (%)
```dax
Taxa de Barris no Mercado (%) = 
DIVIDE([Barris em Clientes], [Total Barris Frota], 0)
```

### Tempo Médio de Retenção no Cliente (Dias de Giro)
```dax
Dias Médios no Cliente = 
CALCULATE(
    AVERAGE(Fato_Barris_Posicao[days_at_client]),
    Fato_Barris_Posicao[current_status] = "NO_CLIENTE"
)
```

### Barris em Alerta Crítico (> 30 dias com o cliente)
```dax
Barris Retidos Alerta 30D = 
CALCULATE(
    COUNTROWS(Fato_Barris_Posicao),
    Fato_Barris_Posicao[current_status] = "NO_CLIENTE",
    Fato_Barris_Posicao[days_at_client] > 30
)
```

---

## 4. 💵 Financeiro & DRE Operacional

### Receitas Totais Liquidadas (R$)
```dax
Receitas Realizadas = 
CALCULATE(
    SUM(Fato_Financeiro[amount]),
    Fato_Financeiro[transaction_type] = "RECEITA",
    Fato_Financeiro[payment_status] = "PAGO"
)
```

### Despesas Totais Pagas (R$)
```dax
Despesas Realizadas = 
CALCULATE(
    SUM(Fato_Financeiro[amount]),
    Fato_Financeiro[transaction_type] = "DESPESA",
    Fato_Financeiro[payment_status] = "PAGO"
)
```

### Resultado Operacional Líquido (EBITDA / Caixa)
```dax
Resultado Líquido = 
[Receitas Realizadas] - [Despesas Realizadas]
```

### Contas a Pagar Futuras (R$)
```dax
Contas a Pagar = 
CALCULATE(
    SUM(Fato_Financeiro[amount]),
    Fato_Financeiro[transaction_type] = "DESPESA",
    Fato_Financeiro[payment_status] = "PENDENTE"
)
```

### Contas a Receber Futuras (R$)
```dax
Contas a Receber = 
CALCULATE(
    SUM(Fato_Financeiro[amount]),
    Fato_Financeiro[transaction_type] = "RECEITA",
    Fato_Financeiro[payment_status] = "PENDENTE"
)
```

### Inadimplência / Títulos Vencidos em Aberto (R$)
```dax
Valor Vencido Inadimplente = 
CALCULATE(
    SUM(Fato_Financeiro[amount]),
    Fato_Financeiro[payment_status] = "PENDENTE",
    Fato_Financeiro[days_overdue] > 0
)
```
