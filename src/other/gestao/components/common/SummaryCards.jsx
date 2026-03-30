import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';

const SummaryCards = ({ cards }) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    {cards.map((card, index) => (
      <Grid item xs={6} sm={6} md={3} key={index}>
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {card.title}
            </Typography>
            <Typography variant="h4" color={card.color}>
              {card.value}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    ))}
  </Grid>
);

export default SummaryCards;








