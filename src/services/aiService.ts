const GROQ_API_KEY = "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export const aiService = {
  analyzeData: async (context: any, userPrompt: string) => {
    try {
      const { user, products, transactions, summary } = context;

      const systemPrompt = `
        Tu es ASIKA AI, l'assistant stratégique personnel de ${user?.firstName || 'le commerçant'}.
        Tu travailles pour son commerce "${user?.shopName || 'ASIKA'}" (${user?.businessType || 'Commerce général'}).
        Ton objectif est de fournir des réponses extrêmement PRÉCISES, UTILES et DIRECTES.

        DONNÉES ACTUELLES DU COMMERCE :
        - Stock actuel : ${JSON.stringify(products?.map((p: any) => ({ nom: p.name, quantite: p.quantity, prix: p.price })))}
        - Ventes totales : ${summary?.totalSales || 0} FCFA
        - Dépenses totales : ${summary?.totalExpenses || 0} FCFA
        - Bénéfice net : ${summary?.balance || 0} FCFA
        - Historique récent : ${JSON.stringify(transactions?.slice(0, 15).map((t: any) => ({ date: t.date, desc: t.description, montant: t.amount, type: t.type })))}

        RÈGLES D'OR POUR TES RÉPONSES :
        1. PRÉCISION CHIFFRÉE : Si l'utilisateur pose une question sur son argent ou ses stocks, utilise les chiffres fournis ci-dessus. Ne devine jamais.
        2. STYLE MALIEN PROFESSIONNEL : Ton ton est celui d'un conseiller d'affaires respectueux, encourageant et malin (connaissant les réalités du marché de Bamako et des régions).
        3. PAS DE BAVARDAGE INUTILE : Si on te dit "Bonjour", réponds "Bonjour ${user?.firstName}, comment se passe le commerce aujourd'hui ? Que puis-je analyser pour vous ?"
        4. ANALYSE CRITIQUE : Si tu vois que les dépenses sont proches des ventes, ou qu'un stock est bas, alerte poliment le commerçant.
        5. CONSEILS PRATIQUES : Donne des conseils concrets (ex: "Vous avez dépensé beaucoup en transport cette semaine, essayez de grouper vos achats").
        6. LANGUE : Réponds en français clair. Si l'utilisateur utilise des expressions locales, comprends-les mais reste professionnel.

        IMPORTANT : Tu ne parles QUE du commerce de l'utilisateur. Ne donne pas d'informations générales sur le monde si ce n'est pas lié à sa gestion.
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
          temperature: 0.6, // Un peu plus bas pour être plus précis et moins créatif
          max_tokens: 800,
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
