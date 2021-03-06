/**
 * Copyright (c) AnyMessage.io. All rights reserved. http://www.anymessage.io
 *
 * The software in this package is published under the terms of the CPAL v1.0
 * license, a copy of which has been included with this distribution in the
 * LICENSE.md file.
 */
import React from 'react';
import getConfig from 'next/config';
import { Elements, StripeProvider } from 'react-stripe-elements';

import PropTypes from 'prop-types';
import Router from 'next/router';
import { Divider, Typography, withStyles } from '@material-ui/core';
import Head from 'next/head';

import Header from '../src/components/Header';

import TeamURL from '../src/components/settings/TeamURL';
import SubscriptionForm from '../src/components/settings/SubscriptionForm';
import TwilioSettings from '../src/components/settings/TwilioSettings';
import UnsavedBar from '../src/components/settings/UnsavedBar';

const { publicRuntimeConfig } = getConfig();
const { STRIPE_PUBLICKEY } = publicRuntimeConfig;

const styles = {
  container: {
    marginTop: 40,
    marginLeft: 80,
  },
  divider: {
    marginBottom: 16,
  },
  nextHeading: {
    marginTop: 32,
  },
  billingInfo: {
    width: '100%',
    maxWidth: 600,
  },
};

class Settings extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      changedSettings: new Set(),
      canSetBilling: false,
      stripe: null,
    };

    this.save = [];
  }

  // redirect unauthed user to "/"
  componentDidMount = () => {
    const { user } = this.props;
    if (!user) {
      Router.push('/?needsauth');
    }

    if (STRIPE_PUBLICKEY) {
      this.setState({
        canSetBilling: true,
        stripe: window.Stripe(STRIPE_PUBLICKEY),
      });
    }
  }

  registerSubmitHandler = (fieldID, submitHandler) => {
    this.save[fieldID] = submitHandler;
  }

  handleSaveClick = () => {
    const { changedSettings } = this.state;
    if (changedSettings.size > 0) {
      const changedFields = Array.from(changedSettings);
      for (let i = 0; i < changedFields.length; i += 1) {
        this.save[changedFields[i]]();
      }
      this.setState({ changedSettings: new Set() });
    }
  }

  handleChanged = (fieldID) => {
    this.setState(({ changedSettings }) => ({
      changedSettings: new Set(changedSettings.add(fieldID)),
    }));
  }

  handleUnchanged = (fieldID) => {
    this.setState(({ changedSettings }) => {
      const newChanged = new Set(changedSettings);
      newChanged.delete(fieldID);

      return {
        changedSettings: newChanged,
      };
    });
  }


  render() {
    const { classes } = this.props;
    const { changedSettings, canSetBilling, stripe } = this.state;
    return (
      <React.Fragment>
        <Head>
          <title>Settings</title>
          {STRIPE_PUBLICKEY && <script src="https://js.stripe.com/v3/" />}
        </Head>
        <Header currentPage="settings" />
        <UnsavedBar
          saveClick={this.handleSaveClick}
          discardClick={() => window.location.reload}
          isUnsaved={changedSettings.size > 0}
        />
        <div className={classes.container}>
          <Typography variant="h3" gutterBottom>
            Team Settings
          </Typography>
          <Divider className={classes.divider} />
          <TeamURL
            submitHandler={this.registerSubmitHandler}
            handleChanged={this.handleChanged}
            handleUnchanged={this.handleUnchanged}
          />
          {canSetBilling && (
            // only render client-side when stripe is in use
            <div className={classes.billingInfo}>
              <StripeProvider stripe={stripe}>
                <Elements>
                  <SubscriptionForm
                    fieldID={2}
                    submitHandler={this.registerSubmitHandler}
                    handleChanged={this.handleChanged}
                    handleUnchanged={this.handleUnchanged}
                    handleError={this.handleError}
                  />
                </Elements>
              </StripeProvider>
            </div>
          )}
          <Typography variant="h3" className={classes.nextHeading} gutterBottom>
            Integrations
          </Typography>
          <Divider className={classes.divider} />
          <TwilioSettings
            submitHandler={this.registerSubmitHandler}
            handleChanged={this.handleChanged}
            handleUnchanged={this.handleUnchanged}
          />
        </div>
      </React.Fragment>
    );
  }
}

Settings.defaultProps = {
  user: null,
};

Settings.propTypes = {
  classes: PropTypes.object.isRequired,
  user: PropTypes.object,
};

export default withStyles(styles)(Settings);
