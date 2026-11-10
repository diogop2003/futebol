# Front-end da Pelada

Angular 21, TypeScript, componentes standalone e comunicação REST com a API PHP em `/api`.

```bash
npm ci
npm start
npm run typecheck
npm run build
npm run test:ci
```

Para testes, configure `CHROME_BIN` se o Chrome não for encontrado. `npm start` usa `proxy.conf.json` para a API local em `127.0.0.1:8000`. O build estático fica em `dist/pelada-web/browser`.

Consulte o [README da raiz](../README.md) para configurar MariaDB, criar o administrador, importar o histórico, executar a aplicação e implantar em PHP/Nginx.
