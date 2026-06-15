const GROQ_API_KEY = "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const aiService = {
  analyzeData: async (context: any, userPrompt: string) => {
    try {
      const { user, products, transactions, summary } = context;

      const systemPrompt = `
        Tu es ASIKA AI, l'assistant expert en gestion de commerce au Mali.
        Ton but est d'aider le commerçant à réussir de manière naturelle et intelligente.

        CONTEXTE DU COMMERCE (Utilise ces données UNIQUEMENT si la question de l'utilisateur le nécessite) :
        - Nom du commerce : ${user?.shopName || 'Non défini'}
        - Type d'activité : ${user?.businessType || 'Général'}
        - Commerçant : ${user?.firstName} ${user?.lastName}
        - Produits en stock : ${JSON.stringify(products?.map((p: any) => ({ name: p.name, qty: p.quantity, price: p.price })))}
        - Résumé financier : ${JSON.stringify(summary)}
        - Dernières transactions : ${JSON.stringify(transactions?.slice(0, 10))}

        DIRECTIVES DE RÉPONSE :
        1. RÉPONS UNIQUEMENT À CE QUE L'UTILISATEUR DEMANDE. Ne donne pas de statistiques ou d'analyses si l'utilisateur dit simplement "Bonjour" ou "Salut".
        2. Si l'utilisateur te salue, réponds poliment et demande comment tu peux l'aider aujourd'hui.
        3. Utilise les données du commerce seulement pour répondre à des questions spécifiques sur les stocks, les ventes, les bénéfices ou pour faire une analyse demandée.
        4. Réponds en français simple et efficace. Ton ton doit être professionnel, amical et adapté au contexte malien.
        5. Sois bref pour les salutations et détaillé seulement quand on te demande un conseil ou une analyse.
      `;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur de connexion à l\'IA');
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error("AI Error:", error);
      throw error;
    }
  }
};
