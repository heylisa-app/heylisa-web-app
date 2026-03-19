This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


PROCESSUS SPLIT TERMINAL CURSOR (ultra clean)

Dans Cursor / VS Code :

Terminal → Split Terminal
À gauche :
cd ~/dev/heylisa-backend


puis : 
source .venv/bin/activate
LOG_LEVEL=DEBUG python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

3. À droite :
cd ~/dev/heylisa-mobile
npm start

ROADMAP

1/ rajouter un intent pour l'orchestrator lorsque le user fait une demande hors cadre professionnel/medical => actuellement en normal_run coe cest pas prévu, bah orchestrator prend un intent au pif et après la réponse est folklorik.

2/ ajouter une vue 'Support humain' dans le shell => dedans on permet de prendre un rdv via calendly. on doit avoir une intégration nickel, pas un truc web où caldndly demande les cookies etc, cest pas très premium. 

3/ faire le flow paywall => au bout des 7 jours d'essai gratuit, lisa doit proposer la continuité de ses services sinon paywall. et en attendant avoir une vue intermediaire sur le menu 'Formule/Facturation' donc la vue finale de la maquette actuelle on l'a uniquement quand le service devient payant, le compte est créé sur stripe

4/ Cadrer le mode preview => en gros quand un nouveau user crée un compte, il ne trouve pas une app vide, mais voit et peut naviguer avec les données factices qu'on a actuellement en dev. Et dès que lisa charge une première donnée réelle, quelle qu'elle soit, là le mode preview disparait et le user reste toujours en mode réel

5/ Coder le chemin complet qui prépare un payload si brief automation détecté et déclenche le webhook utile

6/ Coder le chemin pour la gestion du suivi des tâches qui pareil va déclencher le bon webhook

7/ Mettre en place les workflows liés aux différents webhooks, y compris celui des user_facts 

8/ Gérer l'envoi de pj et de prise de notes audios

9/ Gérer l'intégration des agendas google/Outlook/Doctolib

10/ Construire le flow complet de gestion des mails Cabinet

11/ Intégrer la vue Patients (elle s'anime réellement avec les actions Lisa)

12/ Intégrer la vue dashboard

13/ Construire toute la documentation heylisa pour alimenter Lisa




À froid, ton backlog se découpe très bien en 4 blocs de lancement :

Bloc 1 — garde-fous produit indispensables

C’est ce qui évite une app bancale ou incohérente au launch :
	1.	intent hors cadre pro/médical
	2.	paywall essai gratuit → continuité ou blocage
	3.	mode preview → données fake au départ, disparition dès première vraie donnée
	4.	vue Support humain propre avec Calendly bien intégré

Bloc 2 — tuyauterie d’orchestration interne

C’est ce qui rend Lisa exploitable côté ops :
5. payload + webhook pour brief automation
6. payload + webhook pour suivi des tâches
7. workflows n8n liés aux webhooks, y compris user_facts

Bloc 3 — capacités cœur produit

C’est ce qui transforme Lisa en vraie assistante cabinet :
8. PJ + notes audio
9. intégrations Google / Outlook / Doctolib
10. flow complet gestion des mails cabinet

Bloc 4 — profondeur produit + crédibilité

C’est ce qui fait monter le niveau perçu :
11. vue Patients réellement animée
12. vue Dashboard
13. documentation HeyLisa pour alimenter Lisa

Mon avis franc sur l’ordre de reprise

Au redémarrage, je te conseille qu’on reparte dans cet ordre précis :

A. Hors cadre + paywall + preview
B. Support humain
C. Webhooks internes automation / tâches / user_facts
D. PJ + audio
E. Agendas + mails cabinet
F. Patients + dashboard
G. Documentation HeyLisa

Pourquoi cet ordre ?
Parce que A+B+C sécurisent le launch.
Le reste augmente la puissance produit, mais ne doit pas casser le cadre.