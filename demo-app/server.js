const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Ứng dụng này chứa rất nhiều lỗi bảo mật!');
});

// Lập trình viên vô tình để quên Token ở đây (Trivy sẽ bắt được lỗi này)
const GITHUB_TOKEN = 'ghp_1234567890abcdef1234567890abcdef1234';

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
