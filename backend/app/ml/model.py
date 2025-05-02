import torch
import torch.nn as nn

class BiLSTMAttention(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim, num_layers=2, dropout=0.2):
        super(BiLSTMAttention, self).__init__()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # LSTM layers
        self.lstm = nn.LSTM(
            input_dim, hidden_dim, num_layers, 
            batch_first=True, dropout=dropout, bidirectional=True
        )
        
        # Attention mechanism
        self.attention = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, 1)
        )
        
        # Output layer
        self.fc = nn.Linear(hidden_dim * 2, output_dim)
        
    def forward(self, x):
        # x shape: (batch_size, seq_length, input_dim)
        batch_size, seq_len, _ = x.size()
        
        # LSTM forward pass
        lstm_out, (_, _) = self.lstm(x)
        # lstm_out shape: (batch_size, seq_length, hidden_dim*2)
        
        # Attention mechanism
        attn_weights = self.attention(lstm_out)
        attn_weights = torch.softmax(attn_weights, dim=1)
        
        # Apply attention weights to LSTM output
        context = torch.bmm(attn_weights.transpose(1, 2), lstm_out)
        # context shape: (batch_size, 1, hidden_dim*2)
        
        # Final prediction
        output = self.fc(context.squeeze(1))
        return output