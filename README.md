# 🤖 Rotação 3D e Transformação Homogênea

Visualizador interativo desenvolvido para demonstrar **rotações em 3D, transformações homogêneas e evolução de frames de referência**.

Projeto criado para a disciplina de **Robótica Industrial – SENAI CIMATEC**.

A aplicação permite aplicar **sequências de rotações e translações** e observar visualmente como os **eixos de um frame se transformam ao longo das operações**.

---

# 👨‍💻 Autor

👨‍💻 **Henrique Sá Barretto de Oliveira**

🎓 **Robótica Industrial - SENAI CIMATEC - 2026**

---

# 🎯 Objetivo

Este projeto foi desenvolvido como uma **ferramenta educacional** para auxiliar na compreensão de conceitos fundamentais de **robótica e cinemática espacial**.

Ele permite visualizar, passo a passo, como transformações afetam sistemas de coordenadas.

### Conceitos abordados

* Sistemas de coordenadas
* Rotações em 3D
* Ordem de rotações
* Transformações homogêneas
* Evolução de frames de referência

💡 A interface mostra **cada etapa da transformação**, facilitando a conexão entre **representação matemática e visualização espacial**.

---

# 🚀 Funcionalidades

## 🔄 Rotações sequenciais

O usuário pode adicionar múltiplas rotações definindo:

* eixo de rotação (**X, Y ou Z**)
* ângulo de rotação
* unidade do ângulo (**graus ou radianos**)

A ordem das rotações é respeitada:

```
R = R₁ · R₂ · ... · Rₙ
```

Isso permite estudar o efeito da **não comutatividade das rotações em 3D**.

---

## 📍 Translação

Também é possível aplicar um **vetor de translação** ao frame resultante:

```
t = [Tx Ty Tz]
```

Esse vetor desloca o frame após a aplicação das rotações.

---

## 📌 Vetor posição

Um vetor posição **P** pode ser definido para observar como ele é transformado:

```
P = [Px Py Pz]
```

Após as transformações, o sistema mostra **a nova posição do vetor no espaço**.

---

## 🧭 Visualização de frames

Cada transformação gera um novo **frame de referência** exibido no canvas.

Exemplo da evolução:

```
Frame 0 — frame original
Frame 1 — após R1
Frame 2 — após R2
Frame n — frame final
```

Cada frame exibe:

* eixos **X, Y e Z**
* orientação espacial
* legenda dos eixos

Isso permite acompanhar visualmente a **evolução do sistema de coordenadas**.

---

## 🧮 Matrizes de transformação

O sistema também exibe as **matrizes utilizadas nos cálculos**, incluindo:

* matrizes de rotação
* matriz de transformação homogênea
* vetor transformado

Assim é possível conectar diretamente a:

📊 **representação matemática**
com
🎨 **visualização gráfica**

---

# 🗂 Estrutura do projeto

```
AppRoboticaInd/
│
├── index.html     # Estrutura da interface
├── styles.css     # Estilização da interface
├── app.js         # Lógica das transformações e renderização
│
└── assets/
    └── img/
        ├── RegraMaoDireita.jpg
        └── arco-orientado.png
```

---

# ▶️ Como utilizar

### 1️⃣ Abrir o projeto

Abra o arquivo:

```
index.html
```

em qualquer navegador moderno.

---

### 2️⃣ Adicionar rotações

Clique em:

```
+ Rotação
```

E configure:

* eixo de rotação
* ângulo da rotação

---

### 3️⃣ Definir vetores

Você pode definir:

* vetor de **translação**
* vetor de **posição**

---

### 4️⃣ Executar transformação

Clique em:

```
Calcular
```

O sistema exibirá:

* evolução dos **frames**
* **matrizes de transformação**
* **vetor transformado**

---

# 📚 Conceitos matemáticos

## Regra da mão direita

Define o **sentido positivo das rotações** em sistemas tridimensionais.

---

## Matrizes de rotação

### Rotação em X

```
Rx =
[1    0        0]
[0   cosθ   -sinθ]
[0   sinθ    cosθ]
```

### Rotação em Y

```
Ry =
[cosθ   0   sinθ]
[0      1      0]
[-sinθ  0   cosθ]
```

### Rotação em Z

```
Rz =
[cosθ  -sinθ  0]
[sinθ   cosθ  0]
[0        0     1]
```

---
v
## Transformação homogênea

A transformação completa é representada por:

```
T =
[R  t]
[0  1]
```

Onde:

* **R** → matriz de rotação
* **t** → vetor de translação

---

# 🛠 Tecnologias utilizadas

* **HTML5**
* **CSS3**
* **JavaScript (Vanilla)**
* **Canvas API**

⚡ O projeto **não utiliza bibliotecas externas**.

---

# 📄 Licença

Projeto **educacional**, desenvolvido para fins acadêmicos na disciplina de **Robótica Industrial – SENAI CIMATEC**.
