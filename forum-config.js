// Ligação do fórum com o Supabase.
// Enquanto os dois campos estiverem vazios, o fórum roda em modo demonstração
// (as postagens ficam salvas só no navegador de quem escreveu).
//
// Para ligar de verdade:
//   1. Crie um projeto em https://supabase.com
//   2. Rode supabase/schema.sql no SQL Editor do projeto
//   3. Cole abaixo a "Project URL" e a chave "anon public" (Settings > API)
//
// A chave anon é pública por natureza: quem protege os dados são as regras
// de RLS do schema.sql. NUNCA cole aqui a chave "service_role".
window.FORUM_CONFIG = {
  url: "",
  anonKey: "",
};
